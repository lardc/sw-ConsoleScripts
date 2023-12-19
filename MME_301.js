include("TestCSM.js")
include("TestIGTU.js")
include("TestSVTU.js")
include("TestLCTU.js")

//nid
mme_Adap   = 2
mme_CS     = 6
mme_MXU    = 20
mme_PMXU   = 100
mme_SVTU   = 23
mme_LCSU   = 110
mme_LCTU   = 21
mme_PAU    = 101
mme_IGTU   = 22
mme_TOCU_1 = 180
mme_TOCU_2 = 181
mme_TOCU_3 = 182


// Sleep
Time  = 200

// measure
Ices	= 117	
Ucesat	= 115
Uf		= 116
Iges_P	= 111
Iges_N	= 112
Ugeth	= 113
Qg		= 114
Rterm	= 118

// IGTU_Iges
Iges_Voltage		= 10
Iges_CurrentRange 	= 2
// IGTU_Vgs
Vgs_Voltage		 	= 10
Vgs_Current   	 	= 100
// IGTU_Qg
Qg_Ig 				= 1
Qg_Tp 				= 1
Qg_Vp 				= 1
Qg_Ip 				= 1
//SVTU_Ucesat
Ucesat_Current 		= 100
//LCTU_Ices		
Ices_Voltage		= 300
Ices_PulseWidth		= 50
//

//
//
function Enabled()
{
	dev.co(mme_Adap);

	dev.nid(mme_MXU);
	dev.c(1);
	dev.nid(mme_CS);
	dev.c(100);
	dev.nid(mme_SVTU);
	dev.c(1);
	dev.nid(mme_LCTU);
	dev.c(1);
	dev.nid(mme_IGTU);
	dev.c(1);
	dev.nid(mme_TOCU_1);
	dev.c(1);
	dev.nid(mme_TOCU_2);
	dev.c(1);
	dev.nid(mme_TOCU_3);
	dev.c(1);
}

function Disabled()
{
	dev.co(mme_Adap);

	dev.nid(mme_MXU);
	dev.c(2);
	dev.nid(mme_SVTU);
	dev.c(2);
	dev.nid(mme_LCTU);
	dev.c(2);
	dev.nid(mme_IGTU);
	dev.c(2);
	dev.nid(mme_TOCU_1);
	dev.c(2);
	dev.nid(mme_TOCU_2);	
	dev.c(2);
	dev.nid(mme_TOCU_3);
	dev.c(2);
}

function Clamp(DevType)
{
	dev.nid(mme_CS);
	CSM_PosAdapT (DevType);
}

function Unclamp()
{
	dev.nid(mme_CS);
	dev.c(104);
}

function Сommutation(Type,Position,Measure)
{
	dev.nid(mme_MXU);
	dev.w(128,Position);
	dev.c(Measure);
	sleep(Time);
}
function MeasureIGTU(DevType,Position)
{
	Сommutation(DevType, Position, Rterm);
	dev.nid(mme_IGTU);
	IGTU_Res();
	Сommutation(DevType, Position, Iges_P);
	dev.nid(mme_IGTU);
	IGTU_Iges(Iges_Voltage, Iges_CurrentRange);
	Сommutation(DevType, Position, Iges_N);
	dev.nid(mme_IGTU);
	IGTU_Iges(Iges_Voltage, Iges_CurrentRange);
	Сommutation(DevType, Position, Ugeth);
	dev.nid(mme_IGTU);
	IGTU_Vgs(Vgs_Voltage, Vgs_Current);
	Сommutation(DevType, Position, Qg);
	dev.nid(mme_IGTU);
	IGTU_Qg(Qg_Ig, Qg_Tp, Qg_Vp, Qg_Ip );

}

function MeasureSVTU(DevType,Position)
{
	Сommutation(DevType, Position, Ucesat);
	dev.nid(mme_SVTU);
	SVTU_StartMeasure(Ucesat_Current);
}

function MeasureLCTU(DevType,Position)
{
	Сommutation(DevType, Position, Ices);
	dev.nid(mme_LCTU);
	LCTU_Start(Ices_Voltage, Ices_PulseWidth);
}

function Start(DevType)
{
	Clamp(DevType);
	MeasureIGTU(DevType,1);
	MeasureSVTU(DevType,1);
	MeasureLCTU(DevType,1);
	sleep(Time);
	MeasureIGTU(DevType,2);
	MeasureSVTU(DevType,2);
	MeasureLCTU(DevType,2);
	Unclamp();
}
