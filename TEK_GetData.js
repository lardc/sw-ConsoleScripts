include("Tektronix.js")
include("CalGeneral.js")

// Channels
UsePort = 1;

// 
Cal_RCU = 1;

//
Use_Min = 0.5;
Use_Max = 0.9;

//---------------------------------------------------------------------------------------------------------------------------------------------------------
function TEK_GD_Init(Port)
{
	TEK_PortInit(Port, 9600);
	TEK_Send("data:width 1");
	TEK_Send("data:encdg rpb");
	TEK_Send("data:start 1");
	TEK_Send("data:stop 2500");
}
//---------------------------------------------------------------------------------------------------------------------------------------------------------
function TEK_Init(PortTek,UsePort)
{

	if (UsePort < 1 || UsePort > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	TEK_GD_Init(PortTek);
	
	// Tektronix init
	for (var i = 1; i <= 4; i++)
	{

		if (i == UsePort)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}

	
}
//---------------------------------------------------------------------------------------------------------------------------------------------------------
function GetChannelData(Channel) 
{

	// read basic data
	var p_scale = TEK_Exec("ch" + Channel + ":scale?");
	var p_position = TEK_Exec("ch" + Channel + ":position?");

	// init data read
	TEK_Send("data:source ch" + Channel);

	// read curve
	var data_input = TEK_Exec("curve?");
	print("Channel " + Channel + " loaded");

	// validate data
	if ((data_input[0] != "#") || (data_input[1] != 4) || (data_input[2] != 2) ||
		(data_input[3] != 5) || (data_input[4] != 0) || (data_input[5] != 0))
	{
		print("Invalid CH" + Channel + " data.");
		return;
	}

	// adjust data
	var res = [];
	for (var i = 6; i < 2506; ++i)
		res[i - 6] = (((data_input[i].charCodeAt(0) - 128 - p_position * 25) * p_scale / 25)*10000).toFixed(0);
	
	return res;
}
//---------------------------------------------------------------------------------------------------------------------------------------------------------
function SaveChannelData(NameFile, Data)
{
save(cgen_correctionDir + "/" + NameFile + ".csv", Data);
}

function ChannelData(NameFile, Channel)
{
	var Data = [];
	Data = (GetChannelData(Channel));
	SaveChannelData(NameFile, Data);
}
//---------------------------------------------------------------------------------------------------------------------------------------------------------
function Use_Data(InNameFile, OutNameFile)
{
	Load = [];
	Use_Load =[];
	Start = 0;
	End = 0;
	Load = load(cgen_correctionDir + "/" + InNameFile + ".csv");
	Measure = TEK_Measure(UsePort) * 1e4;
	//p("Measure" + Measure);
	for (var i = 0; i < Load.length; ++i)
	{
		if (Load[i] <= Measure * Use_Max && Load[i+1] <= Measure * Use_Max && Load[i+2] <= Measure * Use_Max && Load[i+3] <= Measure * Use_Max && Load[i+4] <= Measure * Use_Max) 
		//if (Load[i] <= 400)
		{ 
			Start = i;
			//p("Start " + Start);
			break;
		}
	}	
	for (var i = Load.length ; i > 0 ; --i)	
	{
		if (Load[i] >= Measure * Use_Min && Load[i-1] >= Measure * Use_Min && Load[i-2] >= Measure * Use_Min && Load[i-3] >= Measure * Use_Min && Load[i-4] >= Measure * Use_Min)
		{	
			End = i;
			//p("End " + End);
			break;
		}
	}
	
	for (var i = Start; i < End; ++i)
	{
		Use_Load.push(Load[i]);	
	}
	save(cgen_correctionDir + "/" + OutNameFile + ".csv", Use_Load);

}
//---------------------------------------------------------------------------------------------------------------------------------------------------------
// Нахождение скорости спада  
function Use_Time(InNameFile)
{
	Load = [];
	Use_Load =[];

	var p_h_scale = TEK_Exec("HORizontal:scale?");
	T = (p_h_scale * 1e6) / 250; 
	p("p_h_scale " + p_h_scale * 1e6);
	p("T " + T);
	Load = load(cgen_correctionDir + "/" + InNameFile + ".csv");
	Min = Load[Load.length - 1]/10;
	p("Min " + Min);
	Max = Load[0]/10;
	p("Max " + Max);
	dI = Max - Min
	p("dI " + dI);
	dT = (Load.length) * T;
	p("dT " + dT)
	RateScope = (dI / dT).toFixed(3);
	return RateScope;
}
//---------------------------------------------------------------------------------------------------------------------------------------------------------
// Отзеркаливание массива 
function InvertData(InNameFile, OutNameFile)
{
	Load = [];
	Invert = [];
	Load = load(cgen_correctionDir + "/" + InNameFile + ".csv");
	
	for (var i = Load.length - 1 ; i > - 1 ; --i)
	{
		//p("i" + i);	
		Invert.push(Load[i]);

	}
	save(cgen_correctionDir + "/" + OutNameFile + ".csv", Invert);
}
//---------------------------------------------------------------------------------------------------------------------------------------------------------
// Взятие производной массива данных
function Derivative(InNameFile, OutNameFile)
{
	Load = [];
	Out = [];
	Der = [];
	Derout = [];
	Outder = [];
	Factor = 3e-2;

	Load = load(cgen_correctionDir + "/" + InNameFile + ".csv");

	for (var N = 0; N < Load.length; ++N)
	{	
		Out[0] = Load[0];
		Out[N] = Load[N] * Factor + (1 - Factor) * Out[N-1];
	}	
	for (var K = 0; K < Load.length; ++K)
	{
		Der[0] = 0;
		Der[K] = Out[K] - Out[K-1];
	}
	for (var L = 0; L < Load.length; ++L)
	{	
		Derout[0] = Der[0];
		Derout[L] = Der[L] * Factor + (1-Factor) * Derout[L-1];
	}
	for (var Q = 0; Q < Load.length; ++Q)
	{
		Outder.push(Load[Q] + ";" + Out[Q] + ";" + Der[Q] + ";" + Derout[Q]);
	}
	save(cgen_correctionDir + "/" + OutNameFile + ".csv", Outder);

}
//---------------------------------------------------------------------------------------------------------------------------------------------------------