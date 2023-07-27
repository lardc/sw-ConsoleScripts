include("PrintStatus.js")
include("CalGeneral.js")

// Predefined variables
qrr_idc_width = 2000;		// in us
qrr_single = 0;

// QRR
function QRR_Start(Mode, IDC, IDCFallRate, OSV, OSVRate)
{
	/*if (dev.r(192) == 1)
	{
		dev.c(3);
		print("Clear fault");
		sleep(500);
	}
	
	if (dev.r(192) == 0)
	{
		print("Power up");
		dev.c(1);
		
		while (dev.r(192) == 3)
		{
			if (anykey()) return;
			sleep(50);
		}
	}*/
	
	if (dev.r(192) != 4)
	{
		print("Abnormal state");
		QRR_Status();
		return;
	}
	
	dev.w(128, Mode);
	//
	dev.w(129, IDC);
	dev.w(130, qrr_idc_width);
	dev.w(132, Math.round(IDCFallRate * 10));
	//
	dev.w(133, OSV);
	dev.w(134, OSVRate);
	
	if (qrr_single)
		dev.c(102);
	else
	{
		print("Process");
		dev.c(100);
	}
	if (dev.r(192) == 1) QRR_Status();
	var pulse_counter = dev.r(199);
	while (dev.r(192) == 5)
	{
		if (anykey()) return;
		if (pulse_counter != dev.r(199))
		{
			pulse_counter = dev.r(199);
			print("Pulse #" + pulse_counter);
		}
		sleep(50);
	}
	
	if (dev.r(192) != 4)
		print("Failed");
	
	/*if (dev.r(205) != 0)
		print("DC retries number: " + dev.r(205));*/
	
	if (dev.r(198) != 1){
		print("Operation result: " + dev.r(198));
		QRR_Status();
		p("Slomalos!");
		readline();
	}
}

function QRR_Status()
{
	print("[QSU]")
	QSU_Status();
	PrintStatus();
	print("Fault ex. r.:	" + dev.r(197));
	print("Op. result:	" + dev.r(198));
	print("-------------------------");
	
	print("[HS Sampler]");
	if (dev.r(2) == 0)
	{
		QSU_NodeStatus(0, 192);
		print("Fault ex. r.:	" + QSU_ReadReg(0, 197));
	}
	else
		print("Emulation");
	print("-------------------------");
	
	print("[QPU LP]");
	if (dev.r(1) == 0)
	{
		print("SDC  voltage = " + QSU_ReadReg(101, 111) / 10 + " V");
		print("SRC  voltage = " + QSU_ReadReg(101, 112) / 10 + " V");
		print("VLIM voltage = " + QSU_ReadReg(101, 113) / 10 + " V");
		QSU_NodeStatus(101, 96);
	}
	else
		print("Emulation");
	print("-------------------------");
	
	print("[FCROVU]");
	if (dev.r(1) == 0)
	{	
		QSU_NodeStatus(7, 192);
		print("Fault ex. r.:	" + QSU_ReadReg(7, 199));
	}
	else
		print("Emulation");
	print("-------------------------");
}

function QRR_Result()
{
	var op_result = dev.r(198);
	print("Result " + ((op_result == 0) ? "NONE" : (op_result == 1) ? "OK" : "FAILED"));
	print("Qrr,   uC: " + (dev.r(210) / 10));
	print("Irr,    A: " + dev.r(211));
	print("trr,   us: " + (dev.r(212) / 10));
	print("tq,    us: " + (dev.r(213) / 10));
	print("Idc,    A: " + dev.r(214));
	print("dIdt,A/us: " + (dev.r(215) / 10));
	
	plot(dev.rafs(1), 1, 0);
	sleep(200);
	plot(dev.rafs(2), 1, 0);
}

function QRR_PlotDiag()
{
	var p;
	for (var i = 3; i <= 11; ++i)
	{
		plot(p = dev.raf(i), 1, 0);
		save("_qrr_diag" + i + ".txt", p);
		sleep(200);
	}
}

function QRR_PlotFull(Scale)
{
    var a, b;

    a = new Array();
    b = new Array();

    while(true)
    {
		QSU_WriteReg(0, 151, Scale);
		
        QSU_Call(0, 11);
		QSU_ReadArray(0, 4);
        var a1 = dev.rafs(1);
		
		QSU_ReadArray(0, 5);
        var b1 = dev.rafs(1);
        
		a = a.concat(a1);
		b = b.concat(b1);

        if(a1.length == 0 || anykey())
			break;
    }

	print(a.length);
    plot(a, 1, 0); sleep(500);
	plot(b, 1, 0);
}

// QSU
function QSU_SamplerResult()
{
	var op_result = QSU_ReadReg(0, 200);
	print("Result " + ((op_result == 0) ? "NONE" : (op_result == 1) ? "OK" : "FAILED"));
	print("Irr,   A: " + QSU_ReadReg(0, 201));
	print("Qrr,  uC: " + QSU_ReadReg(0, 203));
	print("trr,  us: " + (QSU_ReadReg(0, 202) / 10));
	print("Zero, us: " + (QSU_ReadReg(0, 204) / 10));
	print("ZeroV,us: " + (QSU_ReadReg(0, 205) / 10));
	
	QSU_Plot(0, 1);
	sleep(200);
	QSU_Plot(0, 2);
}

function QSU_ReadReg(NodeID, Reg)
{
	dev.w(150, NodeID);
	dev.w(151, Reg);
	dev.c(10);
	
	if (dev.r(230) == 0)
		return dev.r(231);
	else
	{
		print("Err code: " + dev.r(230));
		return 0;
	}
}

function QSU_ReadRegS(NodeID, Reg)
{
	dev.w(150, NodeID);
	dev.w(151, Reg);
	dev.c(10);
	
	if (dev.r(230) == 0)
		return dev.rs(231);
	else
	{
		print("Err code: " + dev.r(230));
		return 0;
	}
}

function QSU_WriteReg(NodeID, Reg, Value)
{
	dev.w(150, NodeID);
	dev.w(151, Reg);
	dev.w(152, Value);
	dev.c(11);
	
	if (dev.r(230) != 0)
		print("Err code: " + dev.r(230));
}

function QSU_WriteRegS(NodeID, Reg, Value)
{
	dev.w(150, NodeID);
	dev.w(151, Reg);
	dev.ws(152, Value);
	dev.c(11);
	
	if (dev.r(230) != 0)
		print("Err code: " + dev.r(230));
}

function QSU_Call(NodeID, Action)
{
	dev.w(150, NodeID);
	dev.w(151, Action);
	dev.c(12);
	
	if (dev.r(230) != 0)
		print("Err code: " + dev.r(230));
}

function QSU_ReadArray(NodeID, EndPoint)
{
	dev.w(150, NodeID);
	dev.w(151, EndPoint);
	dev.c(13);
	
	if (dev.r(230) != 0)
		print("Err code: " + dev.r(230));
}

function QSU_Status()
{
	print("Logic state:	" + dev.r(200));
	print("[Interface status]");
	print("Device: 	" + dev.r(201));
	print("Function: 	" + dev.r(202));
	print("Error: 		" + dev.r(203));
	print("ExtData:	" + dev.r(204));
}

function QSU_Plot(Node, EndPoint)
{
	QSU_ReadArray(Node, EndPoint);
	plot(dev.rafs(12), 1, 0);
}

function QSU_PlotQPU()
{
	var CurrentSetup, Current, DAC, CurrentError;
	
	QSU_ReadArray(101, 1);
	CurrentSetup = dev.raf(1);
	
	QSU_ReadArray(101, 2);
	Current = dev.raf(1);
	
	QSU_ReadArray(101, 3);
	DAC = dev.raf(1);
	
	QSU_ReadArray(101, 4);
	CurrentError = dev.rafs(1);
	
	plot(CurrentSetup, 30, 0); sleep(100);
	plot(Current, 30, 0); sleep(100);
	plot(CurrentError, 30, 0); sleep(100);
	plot(DAC, 30, 0); sleep(100);
}

function QSU_NodeStatus(Node, BaseReg)
{
	print("Registers [" + BaseReg + " - " + (BaseReg + 4) + "]");
	print("Device state:	" + QSU_ReadReg(Node, BaseReg));
	print("Fault reason:	" + QSU_ReadReg(Node, BaseReg + 1));
	print("Disable reason:	" + QSU_ReadReg(Node, BaseReg + 2));
	print("Warning:	" + QSU_ReadReg(Node, BaseReg + 3));
	print("Problem:	" + QSU_ReadReg(Node, BaseReg + 4));
}

function QSU_TestCom()
{
	while(!anykey())
	{
		QSU_Call(0, 10);
		sleep(100);
		QSU_Plot(0, 3);
		sleep(1000);
	}
}
//------------------------

// QPU
function QPU_PrintV()
{
	print("SRC voltage set, V: 	" + (dev.r(110) / 10));
	
	print("SDC voltage, V: 	" + (dev.r(111) / 10));
	print("SRC voltage, V: 	" + (dev.r(112) / 10));
	print("Diode-clamp voltage, V: " + (dev.r(113) / 10));
}

function QPU_Start(IDC, IDCFallRate)
{
	if (dev.r(96) == 0)
	{
		dev.c(1);
		print("Waiting for charge...");
	}
	
	if (dev.r(96) == 3)
	{
		var State = 0;
		do
		{
			State = dev.r(96);
			switch (State)
			{
				case 4:
					print("Charge ready.");
					break;
				case 3:
					break;
				default:
					print("Charge error.");
					return;
			}
			sleep(50);
		}
		while (State != 4);
	}
	else if (dev.r(96) != 4 && dev.r(96) != 9)
	{
		print("Device is in wrong state {" + dev.r(96) + "}");
		return;
	}
	
	dev.w(64, IDC);
	dev.w(65, Math.round(IDCFallRate * 10));
	dev.c(100);
	while(dev.r(96) != 6) sleep(50);
	print("Config ready.");
	dev.c(101);
	print("Direct current start.");
	while(dev.r(96) != 9) sleep(50);
	print("Finished.");
	
	if (dev.r(96) != 9)
		PrintStatus();
}

function QPU_Plot()
{
	plot(dev.rafs(1), 30, 0);
	sleep(1000);
	plot(dev.rafs(2), 30, 0);
	sleep(1000);
	plot(dev.rafs(3), 30, 0);
	sleep(1000);
	plot(dev.rafs(4), 30, 0);
}


function QRR_CANCal(Port,NID,DRCU_Active, DRCU_Present)
{
dev.Connect(Port);
dev.nid(NID);
if(dev.r(192) == 1) {
	QRR_Status();
	p("Warning! Fault detected! Reset? Y/N");
	QRR_key = readkey();
	switch (QRR_key){
	case ('Y'):
	dev.c(3);
	case ('N'):
	break;
	default:
	p('Invalid input. Fault NOT reset.');
	break;
	}
}
	
	
QRRCount=8;
for (QRRCount=8; QRRCount>=0 ; QRRCount--){//Emulate Everything except CSU
	dev.w(QRRCount, 1);
}
//dev.w(9,1);		//Emulate CSU
DRCU_Present
switch (DRCU_Present) {// RCU/DCU number connected and needed to be powered
case 10:
dev.w(2,1);  
dev.w(5,0); //Activate RCU1
p('DCU1 emulated (not charging)');
break;
case 01:
dev.w(2,0); //Activate DCU1
dev.w(5,1);  
p('RCU1 emulated (not charging)');
break;
default:
p('Invalid DRCU config, ignoring power-up override');
}
dev.c(2);
sleep(500);
dev.c(1);
sleep(5000);
if(dev.r(9) == 0){
while((dev.r(241) < 988)) {
sleep(1000);
p(dev.r(241) + "V, charging" );
}
p("CSU Voltage OK");
}
switch (DRCU_Active) {// RCU/DCU number to be active
case 10:
dev.w(2,1); //Emulate DCU1 
dev.w(5,0); 
p('DCU1 emulated');
break;
case 01:
dev.w(2,0);
dev.w(5,1); //Emulate RCU1 
p('RCU1 emulated');
break;
default:
p('Invalid DRCU config, ignoring emulation override');
}
dev.c(2);
sleep(200);
dev.w(170,1);
dev.c(31); // Generate control pulse for QCUHC
sleep(200);
}

