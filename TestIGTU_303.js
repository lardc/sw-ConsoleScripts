include("PrintStatus.js")
igtu_uge 	= 1;
igtu_iges 	= 2;

function IGTU_Res()
{
	if(dev.r(192) == 3)
	{
		dev.c(103);
		sleep(dev.r(90));
	}	
	while (dev.r(192) != 3) sleep(50);
		
	if(dev.r(196) != 0)
	{
		PrintStatus();
		return;
	}

	p('R, Ohm: ' + dev.rf(205).toFixed(3));
	p("V, V:" + dev.rf(232).toFixed(6));
	p("I, mA:" + dev.rf(230).toFixed(6));

}
//--------------------

function IGTU_Iges(Voltage)
{
	dev.wf(136, Voltage);
	
	if(dev.r(192) == 3)
	{
		dev.c(102);
		
		p("Start process...")
		
		sleep(dev.r(86));
		
		while(dev.r(192) != 3)
		{
			if(dev.r(192) == 1)
			{
				PrintStatus();
				return;
			}
		}
		
		if(dev.r(196) != 0)
			PrintStatus();
		
		p("Iges, A:" + dev.rf(204).toFixed(12));
	}
	else
		PrintStatus();
}
//--------------------

function IGTU_Vgs(Current)
{
	dev.wf(128, Current);
	
	if(dev.r(192) == 3)
	{
		dev.c(100);
			
		while (dev.r(192) != 3) sleep(50);
		
		if(dev.r(196) != 0)
		{
			PrintStatus();
			return;
		}
		
		p("Vges, V:" + dev.rf(200).toFixed(6));
		p("V, V:" + dev.rf(232).toFixed(6));
		p("I, mA:" + dev.rf(230).toFixed(6));
	}
}
//--------------------
// Ресурсный тест при максимальном токе (igtu_uge) и при максимальном напряжении (igtu_iges)
function IGTU_ResourceTest(Measure, HoursTest)
{
	var i = 1;
	var MinutesInMs = 60 * 1000;
	var end = new Date();
	var start = new Date();
	var hours = start.getHours() + HoursTest;
	end.setHours(hours);

	while((new Date()).getTime() < end.getTime())
	{
		switch (Measure)
		{
		case igtu_uge:
			dev.w(92,500);
			IGTU_Vgs(500);
			sleep(10000);
			break;
		case igtu_iges:
			dev.w(91, 5000);
			IGTU_Iges(30000);
			sleep(5000);
			break;
		default:
			print("Incorrect Measure.");
			break;
		}

		var left_time = new Date(end.getTime() - (new Date()).getTime());
		print("#" + i + " Осталось " + (left_time.getHours() - 3) + " ч и " + left_time.getMinutes() + " мин");

		var elapsed_time = new Date((new Date()).getTime() - start.getTime());

		if (anykey()) break;

		i++;
	}
}
//--------------------

function IGTU_SaveCSV_EP()
{
	var Suffix = GetDateTimeSuffix();

	save("data/IGTU_EP1_RegulatorIg_" + Suffix + ".csv", dev.raff(1));
	save("data/IGTU_EP2_RegulatorUg_" + Suffix + ".csv", dev.raff(2));
	save("data/IGTU_EP3_RegulatorUpot_" + Suffix + ".csv", dev.raff(3));
	save("data/IGTU_EP4_RegulatorSetpoint_" + Suffix + ".csv", dev.raff(4));
	save("data/IGTU_EP5_RegulatorCorrection_" + Suffix + ".csv", dev.raff(5));
	save("data/IGTU_EP6_RegulatorError_" + Suffix + ".csv", dev.raff(6));
	save("data/IGTU_EP7_DACRaw_" + Suffix + ".csv", dev.raff(7));
}

function GetDateTimeSuffix()
{
	var now = new Date();

	var day = FormatTwoDigits(now.getDate());
	var month = FormatTwoDigits(now.getMonth() + 1);
	var year = now.getFullYear();

	var hours = FormatTwoDigits(now.getHours());
	var minutes = FormatTwoDigits(now.getMinutes());
	var seconds = FormatTwoDigits(now.getSeconds());

	return day + "." + month + "." + year + "_" + hours + "-" + minutes + "-" + seconds;
}

function FormatTwoDigits(value)
{
	return (value < 10 ? "0" : "") + value;
}
